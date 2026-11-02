import json


def test_opencode_is_not_vscode(make_enricher):
    enricher = make_enricher()
    assert (
        enricher.enrich_window("opencode.exe", "OpenCode", "general")["tool"]
        == "OpenCode"
    )
    assert (
        enricher.enrich_window("code.exe", "x", "general")["tool"] == "VS Code"
    )


def test_document_and_hashed_file(make_enricher):
    enricher = make_enricher()
    result = enricher.enrich_window(
        "excel.exe", "C:\\work\\Budget 2026.xlsx - Excel", "accounting"
    )
    document = result["document"]
    assert document["type"] == "spreadsheet"
    assert document["extension"] == "xlsx"
    assert "name_hash" in document["file"]
    assert "Budget" not in json.dumps(document)


def test_raw_file_when_hashing_disabled(make_enricher):
    enricher = make_enricher(privacy={"hash_paths": False})
    result = enricher.enrich_window("notepad.exe", "notes.txt - Notepad", "general")
    assert result["document"]["file"]["name"] == "notes.txt"


def test_files_can_be_disabled(make_enricher):
    enricher = make_enricher(collect={"files": False})
    result = enricher.enrich_window("notepad.exe", "notes.txt - Notepad", "general")
    assert "file" not in result["document"]


def test_tools_can_be_disabled(make_enricher):
    enricher = make_enricher(collect={"tools": False})
    result = enricher.enrich_window("excel.exe", "Budget.xlsx", "general")
    assert result["tool"] == "excel"
    assert result["vendor"] is None
    assert result["domains"] == []
    assert result["category"] == "other"


def test_documents_can_be_disabled_but_files_kept(make_enricher):
    enricher = make_enricher(collect={"documents": False})
    result = enricher.enrich_window("excel.exe", "Budget.xlsx", "general")
    assert result["document"]["type"] is None
    assert result["document"]["extension"] is None
    assert "name_hash" in result["document"]["file"]


def test_programming_language(make_enricher):
    enricher = make_enricher()
    result = enricher.enrich_window(
        "code.exe", "app.tsx - Visual Studio Code", "development"
    )
    assert result["programming_language"] == "TypeScript (React)"


def test_exclude_domains(make_enricher):
    enricher = make_enricher(privacy={"exclude_domains": ["development"]})
    result = enricher.enrich_window("code.exe", "main.py", "development")
    assert result["domains"] == []
    assert result["role"]["inferred"] == "development"
    assert result["tasks"] == ["coding"]


def test_role_prefers_declared(make_enricher):
    enricher = make_enricher()
    result = enricher.enrich_window("excel.exe", "Budget.xlsx", "accounting")
    assert result["role"]["inferred"] == "accounting"


def test_unknown_app_is_low_confidence(make_enricher):
    enricher = make_enricher()
    result = enricher.enrich_window("mystery.exe", "Untitled", "general")
    assert result["tool"] == "mystery"
    assert result["confidence"] == 0.3
    assert result["domains"] == []
