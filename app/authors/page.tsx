import Link from "next/link";
import { authors } from "@/content/authors";

export default function AuthorsIndex() {
  return (
    <main className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-6">Authors</h1>

      <ul className="space-y-3">
        {authors.map((a) => (
          <li key={a.slug}>
            <Link href={`/authors/${a.slug}`} className="text-blue-600 underline">
              {a.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}