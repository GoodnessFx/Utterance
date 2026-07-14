#!/usr/bin/env python3
"""
Flatten Bible JSON files into this format:

[
  {"b": 1, "c": 1, "v": 1, "t": "Verse text"},
  ...
]

Supported input formats:

1. Flat list:
[
  {
    "book": 1,
    "chapter": 1,
    "verse": 1,
    "text": "In the beginning..."
  }
]

2. Nested structure:
{
  "books": [
    {
      "chapters": [
        {
          "chapter": 1,
          "verses": [
            {"verse": 1, "text": "In the beginning..."}
          ]
        }
      ]
    }
  ]
}
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from html import unescape
from pathlib import Path
from typing import Any


HTML_TAG_RE = re.compile(r"<[^>]+>")


def clean_text(value: Any, preserve_line_breaks: bool = False) -> str:
    """Decode HTML entities, remove tags, and normalize whitespace."""
    text = unescape("" if value is None else str(value))

    if preserve_line_breaks:
        text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
        text = HTML_TAG_RE.sub("", text)
        lines = [" ".join(line.split()) for line in text.splitlines()]
        return "\n".join(line for line in lines if line).strip()

    text = re.sub(r"<br\s*/?>", " ", text, flags=re.IGNORECASE)
    text = HTML_TAG_RE.sub("", text)
    return " ".join(text.split()).strip()


def first_present(mapping: dict[str, Any], keys: tuple[str, ...]) -> Any:
    """Return the first existing key from a mapping."""
    for key in keys:
        if key in mapping:
            return mapping[key]
    return None


def as_int(value: Any, label: str) -> int:
    """Convert a value to int or raise a useful error."""
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid or missing {label}: {value!r}") from exc


def flatten_flat_list(
    data: list[Any],
    preserve_line_breaks: bool,
) -> list[dict[str, Any]]:
    """Flatten an already verse-based list with flexible field names."""
    result: list[dict[str, Any]] = []

    for index, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Item {index} is not a JSON object.")

        book = first_present(item, ("book", "b", "book_number", "bookNumber"))
        chapter = first_present(item, ("chapter", "c", "chapter_number", "chapterNumber"))
        verse = first_present(item, ("verse", "v", "verse_number", "verseNumber"))
        text = first_present(item, ("text", "t", "content", "verse_text", "verseText"))

        result.append(
            {
                "b": as_int(book, f"book number at item {index}"),
                "c": as_int(chapter, f"chapter number at item {index}"),
                "v": as_int(verse, f"verse number at item {index}"),
                "t": clean_text(text, preserve_line_breaks),
            }
        )

    return result


def flatten_nested_books(
    data: dict[str, Any],
    preserve_line_breaks: bool,
) -> list[dict[str, Any]]:
    """Flatten books -> chapters -> verses JSON."""
    books = data.get("books")
    if not isinstance(books, list):
        raise ValueError("Nested input must contain a 'books' list.")

    result: list[dict[str, Any]] = []

    for book_index, book in enumerate(books, start=1):
        if not isinstance(book, dict):
            raise ValueError(f"Book {book_index} is not a JSON object.")

        book_number = first_present(
            book,
            ("book", "b", "number", "book_number", "bookNumber"),
        )
        if book_number is None:
            book_number = book_index

        chapters = book.get("chapters")
        if not isinstance(chapters, list):
            raise ValueError(f"Book {book_index} does not contain a 'chapters' list.")

        for chapter_index, chapter in enumerate(chapters, start=1):
            if not isinstance(chapter, dict):
                raise ValueError(
                    f"Chapter {chapter_index} in book {book_index} is not an object."
                )

            chapter_number = first_present(
                chapter,
                ("chapter", "c", "number", "chapter_number", "chapterNumber"),
            )
            if chapter_number is None:
                chapter_number = chapter_index

            verses = chapter.get("verses")
            if not isinstance(verses, list):
                raise ValueError(
                    f"Chapter {chapter_index} in book {book_index} "
                    "does not contain a 'verses' list."
                )

            for verse_index, verse in enumerate(verses, start=1):
                if not isinstance(verse, dict):
                    raise ValueError(
                        f"Verse {verse_index} in book {book_index}, "
                        f"chapter {chapter_index} is not an object."
                    )

                verse_number = first_present(
                    verse,
                    ("verse", "v", "number", "verse_number", "verseNumber"),
                )
                if verse_number is None:
                    verse_number = verse_index

                text = first_present(
                    verse,
                    ("text", "t", "content", "verse_text", "verseText"),
                )

                result.append(
                    {
                        "b": as_int(book_number, "book number"),
                        "c": as_int(chapter_number, "chapter number"),
                        "v": as_int(verse_number, "verse number"),
                        "t": clean_text(text, preserve_line_breaks),
                    }
                )

    return result


def flatten_bible_json(
    data: Any,
    preserve_line_breaks: bool = False,
) -> list[dict[str, Any]]:
    """Detect the input structure and flatten it."""
    if isinstance(data, list):
        return flatten_flat_list(data, preserve_line_breaks)

    if isinstance(data, dict):
        if isinstance(data.get("books"), list):
            return flatten_nested_books(data, preserve_line_breaks)

        for key in ("verses", "data", "results"):
            if isinstance(data.get(key), list):
                return flatten_flat_list(data[key], preserve_line_breaks)

    raise ValueError(
        "Unsupported JSON structure. Expected either a list of verse objects "
        "or an object containing books -> chapters -> verses."
    )


def validate_output(items: list[dict[str, Any]]) -> None:
    """Perform basic validation on the flattened result."""
    if not items:
        raise ValueError("No verses were found in the input file.")

    seen: set[tuple[int, int, int]] = set()

    for index, item in enumerate(items, start=1):
        reference = (item["b"], item["c"], item["v"])

        if reference in seen:
            print(
                f"Warning: duplicate reference found: "
                f"book {item['b']}, chapter {item['c']}, verse {item['v']}",
                file=sys.stderr,
            )
        seen.add(reference)

        if not isinstance(item["t"], str):
            raise ValueError(f"Verse text at output item {index} is not a string.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert a Bible JSON file to flattened b/c/v/t format."
    )
    parser.add_argument("input", type=Path, help="Path to the source JSON file.")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output file path. Default: <input_stem>_flattened.json",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=None,
        help="Pretty-print indentation, for example --indent 2.",
    )
    parser.add_argument(
        "--preserve-line-breaks",
        action="store_true",
        help="Convert <br> tags to newline characters instead of spaces.",
    )
    parser.add_argument(
        "--ascii",
        action="store_true",
        help="Escape non-ASCII characters instead of writing UTF-8 directly.",
    )

    args = parser.parse_args()

    input_path: Path = args.input
    output_path: Path = args.output or input_path.with_name(
        f"{input_path.stem}_flattened.json"
    )

    try:
        with input_path.open("r", encoding="utf-8-sig") as file:
            data = json.load(file)

        flattened = flatten_bible_json(
            data,
            preserve_line_breaks=args.preserve_line_breaks,
        )
        validate_output(flattened)

        with output_path.open("w", encoding="utf-8") as file:
            json.dump(
                flattened,
                file,
                ensure_ascii=args.ascii,
                indent=args.indent,
            )
            file.write("\n")

        print(f"Converted {len(flattened):,} verses.")
        print(f"Saved to: {output_path.resolve()}")
        return 0

    except FileNotFoundError:
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
    except json.JSONDecodeError as exc:
        print(
            f"Error: invalid JSON at line {exc.lineno}, column {exc.colno}: "
            f"{exc.msg}",
            file=sys.stderr,
        )
    except (OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
