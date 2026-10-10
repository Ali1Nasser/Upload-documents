"""F1 hole definitions (G5 verifier follow-up): audible speech with no word-map entries, transcribed by faster-whisper turbo
(glossary prompt, 5 decodes per span) from the SOURCE audio. Latin technical terms are written in English (master 10); Egyptian kept."""
HOLES = [
 dict(id="H1", aid="a:S4:P02", before=(260, 266), after=(267, 271), new=["الـdata", "الـbytes", "والـencoding"], kind="transition", iu="iu:00858",
      gloss="Section two: data, bytes and encoding.", terms=["data", "bytes", "encoding"], orig="الديتا البارتس والإنكورينج",
      note="heading after 'القسم الثاني' (sentence 0018); 'البارتس' heard as bytes/bits/parts, bytes chosen from context (low confidence)"),
 dict(id="H2", aid="a:S4:P13", before=(447, 451), after=(452, 456), new=["القسم", "الثالث", "معمارية", "FastAPI"], kind="transition", iu="iu:01779",
      gloss="Section three: FastAPI architecture.", terms=["FastAPI"], orig="القسم الثالث معمارية Fast API", note="section heading"),
 dict(id="H3", aid="a:S4:P13", before=(658, 662), after=(663, 667), new=["القسم", "الخامس", "الحقن", "والحدود"], kind="transition", iu="iu:01797",
      gloss="Section five: injection and boundaries.", terms=[], orig="القسم الخامس الحقن والحدود", note="section heading"),
 dict(id="H4", aid="a:S4:P14", before=(538, 542), after=(543, 547), new=["where", "stock", "أكبر", "من", "أو", "يساوي", "question", "mark"], kind="example", iu="iu:01858",
      gloss="The condition read aloud: where stock is greater than or equal to question mark.", terms=["where", "stock"], orig="ورسطوك أكبر من أو يساوي question mark",
      note="SQL condition read aloud; 'where stock' from 4 decodes + CTC score (and-stock scored worse)"),
 dict(id="H5a", aid="a:S4:P19", before=(61, 65), after=(66, 70), new=["واحد", "أساسيات", "الـstreaming", "والـKafka"], kind="transition", iu="iu:02280",
      gloss="Agenda item one: streaming and Kafka basics.", terms=["streaming", "Kafka"], numbers=["1"], orig="واحد أساسيات الستريمينج والكافكا", note="agenda"),
 dict(id="H5b", aid="a:S4:P19", before=None, after=(66, 70), new=["اتنين", "الأعطال", "والـschemas", "والكود"], kind="transition", iu="iu:02280",
      gloss="Agenda item two: failures, schemas and code.", terms=["schemas"], numbers=["2"], orig="اتنين الأعطال والسكيماز والكود", note="agenda; second item is in the next EDL segment"),
 dict(id="H6", aid="a:S4:P17", before=(365, 369), after=(370, 374), new=["صف", "واحد", "لكل", "معاملة", "أو", "one", "row", "per", "transaction"], kind="claim", iu="iu:02097",
      gloss="One row per transaction.", terms=["grain", "one-row-per-transaction"], orig="صف واحد لكل معاملة أو One Row Per Transaction", note="the grain principle itself"),
 dict(id="H7", aid="a:S4:P17", before=(413, 417), after=(418, 422), new=["transactions", "revenue", "subscribers", "agents"], kind="claim", iu="iu:02101",
      gloss="The families listed: transactions, revenue, subscribers, agents.", terms=["transactions", "revenue", "subscribers", "agents"], orig="transactions, revenue, subscribers, agents,",
      note="spoken English list; whisper hallucinated subtitle boilerplate over it in the first pass"),
 dict(id="H9", aid="a:S4:P20", before=(608, 612), after=(613, 617), new=["الـsecurity", "والـdisaster", "recovery", "drill"], kind="transition", iu="iu:02421",
      gloss="Section four heading: security and disaster recovery drill.", terms=["security", "disaster-recovery"], orig="السيكيريتي والديزاستر ريكاوري دريل", note="section heading"),
]
# H8 (P17, 125,847): no new word; the spoken number IS the existing token w:S4:P17:000795, re-timed (text unchanged).
RETIME = dict(id="H8", aid="a:S4:P17", before=(790, 794), target=795, after=(796, 800), surrogate="ميه خمسه وعشرين الف تمنميه سبعه واربعين")
SUR = {"FastAPI": "فاست ايه بي اي", "where": "وير", "stock": "ستوك", "question": "كويستشن", "mark": "مارك"}
