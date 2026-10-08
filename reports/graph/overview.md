# Semantic graph overview

Generated 2026-10-08T20:50:28Z by `dc graph report`.

```mermaid
graph LR
  AudioAsset["AudioAsset (28)"] -- "contains (3126)" --> Sentence["Sentence (3126)"]
  Sentence["Sentence (3126)"] -- "says (3126)" --> IdeaUnit["IdeaUnit (2846)"]
  IdeaUnit["IdeaUnit (2846)"] -- "about (8326)" --> Concept["Concept (454)"]
  IdeaUnit["IdeaUnit (2846)"] -- "states (255)" --> DataFact["DataFact (127)"]
  Concept["Concept (454)"] -- "requires (935)" --> Concept["Concept (454)"]
  VisualAsset["VisualAsset (1303)"] -- "illustrates (16121)" --> IdeaUnit["IdeaUnit (2846)"]
  Sentence["Sentence (3126)"] -- "duplicates (773)" --> Sentence["Sentence (3126)"]
  Sentence["Sentence (3126)"] -- "contradicts (0)" --> Sentence["Sentence (3126)"]
  Chapter["Chapter (37)"] -- "uses (166)" --> Pattern["Pattern (22)"]
  AudioAsset["AudioAsset (28)"] -- "version_of (1)" --> AudioAsset["AudioAsset (28)"]
```

Idea-unit rule: tau 0.81, F1 0.876 on 200 labelled pairs (cosine only 0.803). Link floors (p95 of random cosine): concept 0.548, visual 0.568, fact 0.502. `illustrates` counts include 5 candidates per unit plus caption concept tags.

| Node type | Count |
|---|---|
| AudioAsset | 28 |
| Chapter | 37 |
| Concept | 454 |
| DataFact | 127 |
| IdeaUnit | 2846 |
| Pattern | 22 |
| Sentence | 3126 |
| VisualAsset | 1303 |

| Edge type | Count |
|---|---|
| about | 8326 |
| contains | 3126 |
| duplicates | 773 |
| illustrates | 16121 |
| requires | 935 |
| says | 3126 |
| states | 255 |
| uses | 166 |
| version_of | 1 |
