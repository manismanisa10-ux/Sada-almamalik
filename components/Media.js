export default function Media({ m }) {
  if (m.kind === "image" && m.media_url) {
    return (
      <a href={m.media_url} target="_blank" rel="noopener noreferrer">
        <img src={m.media_url} alt="صورة مرسلة" className="chat-img" loading="lazy" />
      </a>
    );
  }
  if (m.kind === "voice" && m.media_url) {
    return <audio src={m.media_url} controls preload="none" className="chat-audio" />;
  }
  if (m.kind === "sticker") return <div className="chat-sticker">{m.body}</div>;
  return <p>{m.body}</p>;
}
