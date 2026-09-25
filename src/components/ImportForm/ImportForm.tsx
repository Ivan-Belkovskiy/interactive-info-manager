"use client";

import { useMemo, useRef, useState } from "react";
import "./ImportForm.css";
import SimpleCheckbox from "../UI/SimpleCheckbox/SimpleCheckbox";

interface ImportedRecord {
    id?: number;
    title: string;
    content: string;
    isEncrypted: boolean;
    categoryId?: number | null;
}

interface ParsedFile {
    version: number;
    exportedAt?: string;
    records: ImportedRecord[];
}

type ImportMode = "insert" | "updateById" | "replaceAll";

export default function ImportForm({ onClose }: { onClose: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null);

    const [parsed, setParsed] = useState<ParsedFile | null>(null);
    const [excluded, setExcluded] = useState<Set<number>>(new Set());
    const [mode, setMode] = useState<ImportMode>("insert");

    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<{
        imported: number;
        updated: number;
        skipped: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    const encryptedCount = useMemo(
        () => parsed?.records.filter((r) => r.isEncrypted).length ?? 0,
        [parsed]
    );

    const includedCount = useMemo(
        () => (parsed ? parsed.records.length - excluded.size : 0),
        [parsed, excluded]
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        setError(null);
        setReport(null);
        setExcluded(new Set());
        setMode("insert");

        try {
            const json = JSON.parse(await f.text());

            const rawRecords = Array.isArray(json)
                ? json
                : Array.isArray(json?.records)
                  ? json.records
                  : null;

            if (!rawRecords) {
                setError("Файл не содержит корректного массива записей");
                setParsed(null);
                return;
            }

            const valid: ImportedRecord[] = [];
            for (const r of rawRecords) {
                if (typeof r?.title !== "string" || typeof r?.content !== "string") continue;
                valid.push({
                    id: typeof r.id === "number" ? r.id : undefined,
                    title: r.title,
                    content: r.content,
                    isEncrypted: !!r.isEncrypted,
                    categoryId: typeof r.categoryId === "number" ? r.categoryId : null,
                });
            }

            if (valid.length === 0) {
                setError("Не найдено ни одной корректной записи");
                setParsed(null);
                return;
            }

            setParsed({
                records: valid,
                version: typeof json.version === "number" ? json.version : 1,
                exportedAt: json.exportedAt,
            });
        } catch {
            setError("Не удалось прочитать файл (невалидный JSON)");
            setParsed(null);
        }
    };

    const toggleExclude = (index: number) => {
        setExcluded((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const handleImport = async () => {
        if (!parsed) return;

        const recordsToImport = parsed.records.filter((_, i) => !excluded.has(i));
        if (recordsToImport.length === 0) {
            setError("Все записи исключены из импорта");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    version: parsed.version,
                    records: recordsToImport,
                    mode,
                }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                const details = json.details ? `\n${json.details.join("\n")}` : "";
                setError(`${json.error ?? "Не удалось импортировать"}${details}`);
                return;
            }

            setReport({
                imported: json.imported ?? 0,
                updated: json.updated ?? 0,
                skipped: excluded.size,
            });
        } catch (err) {
            console.error(err);
            setError("Ошибка сети при импорте");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="import-form">
            <h1 className="import-form__title">Импортировать данные из JSON</h1>

            <div className="import-form__content">
                {error && <div className="import-form__error">{error}</div>}

                {report !== null ? (
                    <div className="import-form__success">
                        ✅ Импортировано: <b>{report.imported}</b>
                        {report.updated > 0 && (
                            <> · Обновлено: <b>{report.updated}</b></>
                        )}
                        {report.skipped > 0 && (
                            <> · Пропущено: <b>{report.skipped}</b></>
                        )}
                    </div>
                ) : parsed ? (
                    <>
                        <div className="import-form__preview">
                            Записей в файле: <b>{parsed.records.length}</b>
                            {encryptedCount > 0 && (
                                <> · зашифровано: <b>{encryptedCount}</b></>
                            )}
                            {" "}· к импорту: <b>{includedCount}</b>

                            {encryptedCount > 0 && (
                                <div className="import-form__hint">
                                    Зашифрованные записи будут импортированы как есть —
                                    расшифровать их можно будет при открытии, введя пароль.
                                </div>
                            )}
                        </div>

                        <div className="import-form__records">
                            <div className="import-form-item heading-item">
                                <div className="import-form-item__left">
                                    <span className="import-form__label">Название</span>
                                </div>
                                <div className="import-form-item__right">
                                    <span className="import-form__label --desktop-only">
                                        Зашифрована?
                                        {/* Шифр. */}
                                    </span>
                                    <span className="import-form__label">Исключить</span>
                                </div>
                            </div>

                            {parsed.records.map((r, i) => (
                                <div
                                    key={i}
                                    className={`import-form-item ${
                                        excluded.has(i) ? "excluded" : ""
                                    }`}
                                >
                                    <div className="import-form-item__left">
                                        <span
                                            className="import-form-item__name"
                                            title={r.title}
                                        >
                                            {r.title}
                                        </span>
                                        {r.id !== undefined && (
                                            <span className="import-form-item__id">
                                                #{r.id}
                                            </span>
                                        )}
                                    </div>
                                    <div className="import-form-item__right">
                                        <span className="import-form-item__encrypted --desktop-only">
                                            {r.isEncrypted ? "✔" : "—"}
                                        </span>
                                        <SimpleCheckbox
                                            checked={excluded.has(i)}
                                            onSelect={() => toggleExclude(i)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="import-form__settings">
                            <span className="import-form__label">Настройки импорта:</span>

                            <div className="import-form__setting">
                                <SimpleCheckbox
                                    checked={mode === "updateById"}
                                    onSelect={(v) =>
                                        setMode(v ? "updateById" : "insert")
                                    }
                                />
                                <span>
                                    Обновлять существующие записи по ID
                                    <small className="import-form__setting-hint">
                                        Если ID совпадает с вашей записью — содержимое
                                        обновится, иначе создастся новая.
                                    </small>
                                </span>
                            </div>

                            <div className="import-form__setting">
                                <SimpleCheckbox
                                    checked={mode === "replaceAll"}
                                    onSelect={(v) =>
                                        setMode(v ? "replaceAll" : "insert")
                                    }
                                />
                                <span>
                                    Заменить все существующие записи
                                    <small className="import-form__setting-hint">
                                        ⚠️ Все текущие записи будут удалены перед
                                        импортом. Действие необратимо.
                                    </small>
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="import-form__block">
                        <button
                            className="import-form__button upload-button"
                            onClick={() => fileRef.current?.click()}
                        >
                            Загрузить JSON-файл...
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileChange}
                            hidden
                            disabled={loading}
                        />
                    </div>
                )}
            </div>

            <div className="import-form__buttons">
                {(!report) && <button
                    type="button"
                    className="import-form__button"
                    onClick={handleImport}
                    disabled={
                        !parsed || loading || report !== null || includedCount === 0
                    }
                >
                    {loading ? "Импортируем..." : `Импортировать (${includedCount})`}
                </button>}
                <button
                    type="button"
                    className="import-form__button button--cancel"
                    onClick={onClose}
                    disabled={loading}
                >
                    {report !== null ? "Закрыть" : "Отмена"}
                </button>
            </div>
        </div>
    );
}