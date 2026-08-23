
export default function TextSelection({ text, selection }: { text: string; selection?: string }) {
  if (!selection?.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${selection})`, 'gi'));
  
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === selection.toLowerCase() ? (
          <span key={i} style={{ backgroundColor: '#ffee00' }}>{part}</span>
        ) : (
          part
        )
      )}
    </span>
  );
}