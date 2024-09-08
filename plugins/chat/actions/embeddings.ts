// app/actions/embeddings.ts
"use server";

import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { cosineDistance, desc, gt, sql, eq } from "drizzle-orm";
import { embeddings } from "@/lib/db/schema/embeddings";
import { resources } from "@/lib/db/schema/resources";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const embeddingModel = openai.embedding("text-embedding-ada-002");

const generateChunks = (
  input: string
): { section: string; content: string }[] => {
  const sections = input
    .split(/(?=^## )/m)
    .filter((section) => section.trim() !== "");
  return sections.map((section) => {
    const [title, ...content] = section.split("\n");
    return {
      section: title.replace("## ", "").trim(),
      content: content.join("\n").trim(),
    };
  });
};

export const generateEmbeddings = async (
  value: string
): Promise<
  Array<{ embedding: number[]; section: string; content: string }>
> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks.map((chunk) => chunk.content),
  });
  return embeddings.map((e, i) => ({ ...chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded
  )})`;
  const similarGuides = await db
    .select({
      section: embeddings.section,
      content: embeddings.content,
      similarity,
      title: resources.title,
      url: resources.url,
    })
    .from(embeddings)
    .innerJoin(resources, eq(embeddings.resourceId, resources.id))
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(1);
  return similarGuides;
};

export async function readMDXFiles(): Promise<
  { slug: string; frontmatter: any; content: string }[]
> {
  const docsDirectory = path.join(process.cwd(), "docs");
  const filenames = await fs.readdir(docsDirectory);

  const mdxFiles = await Promise.all(
    filenames
      .filter((file) => file.endsWith(".mdx"))
      .map(async (filename) => {
        const filePath = path.join(docsDirectory, filename);
        const fileContents = await fs.readFile(filePath, "utf8");
        const { data, content } = matter(fileContents);
        return {
          slug: filename.replace(".mdx", ""),
          frontmatter: data,
          content: content,
        };
      })
  );

  return mdxFiles;
}

export async function ingestMDXFiles() {
  const mdxFiles = await readMDXFiles();

  for (const file of mdxFiles) {
    const existingResource = await db
      .select()
      .from(resources)
      .where(eq(resources.slug, file.slug))
      .limit(1);

    let resourceId: string;

    if (existingResource.length > 0) {
      const [updatedResource] = await db
        .update(resources)
        .set({
          title: file.frontmatter.title,
          description: file.frontmatter.description,
          url: file.frontmatter.url,
          content: file.content,
        })
        .where(eq(resources.slug, file.slug))
        .returning();
      resourceId = updatedResource.id;

      await db.delete(embeddings).where(eq(embeddings.resourceId, resourceId));
    } else {
      const [newResource] = await db
        .insert(resources)
        .values({
          slug: file.slug,
          title: file.frontmatter.title,
          description: file.frontmatter.description,
          url: file.frontmatter.url,
          content: file.content,
        })
        .returning();
      resourceId = newResource.id;
    }

    const contentEmbeddings = await generateEmbeddings(file.content);

    await db.insert(embeddings).values(
      contentEmbeddings.map((embedding) => ({
        resourceId: resourceId,
        section: embedding.section,
        content: embedding.content,
        embedding: embedding.embedding,
      }))
    );
  }

  console.log(`Processed ${mdxFiles.length} MDX files`);
}

export async function generateEmbeddingsAction() {
  try {
    await ingestAndCreateEmbeddings();
    return {
      success: true,
      message: "MDX files processed and embeddings updated successfully",
    };
  } catch (error) {
    console.error("Error processing MDX files:", error);
    return {
      success: false,
      message: "Failed to process MDX files and update embeddings",
    };
  }
}

// Use this function to ingest MDX files and create/update embeddings
export async function ingestAndCreateEmbeddings() {
  await ingestMDXFiles();
}
