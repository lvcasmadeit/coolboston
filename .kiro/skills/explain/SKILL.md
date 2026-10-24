---
name: explain
description: "Explain a topic, term, code, file, error, or the most recent part of the conversation in plain language that a non-technical reader can follow. Invoked with /explain."
argument-hint: "What should I explain? Leave blank to explain the latest reply."
disable-model-invocation: true
---

The user has invoked `/explain`. Your job is to make the subject understandable to a curious, capable reader who is not an expert and does not know the jargon. Be thorough. Cover everything the reader needs to understand the subject, and leave out anything that does not help them understand it.

## Step 1: Decide what to explain

Use the first rule that applies:

1. **Something follows `/explain`.** That text is the subject. It may be a concept ("what is an API"), a term, a snippet of code, a file path, a command, an error message, or a pasted passage. If it is a file path, read the file before explaining it. If it refers to this project, search the repo so the explanation matches what the project actually does.
2. **Nothing follows `/explain`.** Explain the most recent substantive exchange in this conversation: your last reply, along with the user's request that prompted it. Skip greetings and small talk. If the last reply was a plan, a list of changes, or a result, explain what it means, what it changes for the user, and why it matters.
3. **Still unclear.** If you cannot tell what the user wants explained, ask one short question instead of guessing.

Do not modify files or run commands just to produce an explanation. Reading files and searching the repo to get the facts right is fine.

## Step 2: Check the facts

Before writing, confirm the facts you plan to rely on by reading the code, file, or docs. Do not explain from memory when the answer is in front of you. If something is uncertain, say so in plain words, for example: "I could not confirm this from the code, but it looks like...". Never invent details to make an explanation sound complete.

## Step 3: Write for a non-technical reader

- Open with a one- or two-sentence answer to "what is this, in short?"
- Then build up the explanation in order: the big picture first, then the parts, then how the parts fit together.
- Explain why, not only what. Say what problem the thing solves, or what would go wrong without it.
- Use everyday comparisons (a restaurant order, a filing cabinet, a mail carrier) when they match the idea. If the comparison breaks down somewhere that matters, say where.
- When a technical term is unavoidable, define it in the same sentence the first time it appears, in plain words. For example: "an API, which is a set of rules that lets two programs talk to each other, ..."
- Use short sentences and active verbs. Spell out any acronym before using its short form.
- When the idea is abstract, walk through one concrete example with made-up but realistic values.
- For code: describe what it does step by step in plain English. Quote only the short fragments you are discussing. Do not paste long code blocks unless the user asked to see them.
- For errors: say what the message means in plain words, what most likely caused it, and what to try next, in that order.
- For a large subject: give the overall picture first, then offer to go deeper into one part.

Use headings only when the explanation has several distinct parts. Use plain paragraphs otherwise. Use bullet points only for genuine lists.

Length should match the subject. A simple term may need a few short paragraphs. A complex system or a long conversation may need several short sections. Be detailed where the reader needs detail, and brief where they do not.

## Step 4: Finish with the vocabulary

If the explanation used three or more terms a reader might not know, end with a short "Words to know" list, one line per term, in plain language. If the repo has a `GLOSSARY.md`, use its definitions for project-specific terms.

End with one line offering to go deeper into any part. Do not repeat the explanation in a closing summary.

## Tone

Warm, direct, and patient. Do not talk down to the reader. Do not apologize for the subject being complex. Avoid "simply" and "just", since they make hard ideas feel easy when they are not.
