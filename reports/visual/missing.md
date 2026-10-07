# Visual assets merge: completeness

Created 2026-10-07T17:44:12Z by `dc visual merge`.

- listed images (images.jsonl): 752; captioned: 752; with OCR: 752
- merged assets: 1303; by kind: hub_section 150, legacy_shot 400, mermaid 1, png_scene 21, render_keyframe 212, slide 519
- caption batches: 31; batches with a missing output or fewer lines than items: 0
- caption lines repaired (unescaped quotes inside a string): 4; unparsable even after repair: 0
- images without a caption (not in the merged file): 0
- pixel-verified recaptions applied over the batch captions (corpus/visual/recaptions.jsonl): 168; ids not in the image list: 0
- duplicate caption ids across batches (last wins): 0
- asset_id collisions between sources (first kept): 0

## Batches

None: every batch output exists and has at least as many lines as its items.

## Repaired caption lines

These lines were invalid JSON (a `"` inside the `layout` string). The text was kept and the quotes were escaped; nothing was edited.

- data/derived/visual/captions/batch_006.jsonl:9 v:2281c6bc2c0b
- data/derived/visual/captions/batch_006.jsonl:13 v:280398fa9ab0
- data/derived/visual/captions/batch_006.jsonl:15 v:22259ea6afcf
- data/derived/visual/captions/batch_006.jsonl:17 v:ed767c584597

## Notes

- HUB screenshots (`hub_section`) and the Mermaid block carry a text-derived caption (`caption_src` dom-text / source-text), not a vision caption; legacy shots carry a data-derived caption (`legacy-data`). Only `slide`, `png_scene` and `render_keyframe` records have `caption_src: vision`.
- `quality` is mapped from the librarian's 1-5 scale to the contract's 0-3 (5,4 -> 3; 3 -> 2; 2 -> 1; 1 -> 0). Legacy and HUB records are 2.
- The 2,398 HUB `code` items are not assets; search them through `hub_items.jsonl`.
