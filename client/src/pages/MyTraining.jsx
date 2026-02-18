export default function MyTraining({ contents }) {
  return (
    <>
      <h2>My Training</h2>

      {contents.map((c) => (
        <div key={c._id}>
          <h4>{c.title}</h4>

          {c.type === "text" && <p>{c.textContent}</p>}

          {c.fileUrl && (
            <a href={`http://localhost:5003${c.fileUrl}`} target="_blank">
              Open File
            </a>
          )}
        </div>
      ))}
    </>
  );
}
