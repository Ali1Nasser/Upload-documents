# Semantic graph overview

Generated 2026-10-08T19:59:59Z by `dc graph export`.

```mermaid
graph LR
  AudioAsset["AudioAsset (28)"] -- "contains (3126)" --> Sentence["Sentence (3126)"]
  Sentence["Sentence (3126)"] -- "says (3126)" --> IdeaUnit["IdeaUnit (2974)"]
  IdeaUnit["IdeaUnit (2974)"] -- "about (3668)" --> Concept["Concept (454)"]
  Concept["Concept (454)"] -- "requires (0)" --> Concept["Concept (454)"]
  VisualAsset["VisualAsset (1303)"] -- "illustrates (1891)" --> Concept["Concept (454)"]
  Sentence["Sentence (3126)"] -- "duplicates (386)" --> Sentence["Sentence (3126)"]
  Chapter["Chapter (37)"] -- "uses (166)" --> Pattern["Pattern (22)"]
```

| Node type | Count |
|---|---|
| AudioAsset | 28 |
| Chapter | 37 |
| Concept | 454 |
| IdeaUnit | 2974 |
| Pattern | 22 |
| Sentence | 3126 |
| VisualAsset | 1303 |

| Edge type | Count |
|---|---|
| about | 3668 |
| contains | 3126 |
| duplicates | 386 |
| illustrates | 1891 |
| says | 3126 |
| uses | 166 |
