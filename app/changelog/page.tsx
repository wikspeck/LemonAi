import Link from "next/link";
import "../product.css";
import { ChatMarkdown } from "@/app/components/chat-markdown";
import changelog from "@/lib/generated/changelog.json";
export default function ChangelogPage() {
 return <main className="product-changelog"><Link href="/">← Lemon</Link><ChatMarkdown content={changelog.content}/></main>;
}
