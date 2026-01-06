import { notFound } from "next/navigation";
import { authors } from "@/content/authors";

export default async function AuthorProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const author = authors.find((a) => a.slug === slug);

  if (!author) return notFound();

  return (
    <main className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-4">{author.name}</h1>

      <p className="text-lg mb-8">{author.bio}</p>

      <section>
        <h2 className="text-2xl font-semibold mb-3">Published Titles</h2>
        <ul className="space-y-2">
          {author.books.map((book) => (
            <li key={book.title}>
              <a
                href={book.link}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                {book.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}