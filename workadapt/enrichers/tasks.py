MEETING_TOOLS = {"Teams", "Zoom", "Skype", "Google Meet"}
COMMUNICATION_TOOLS = {"Outlook", "Thunderbird", "Slack", "Teams", "Discord", "WhatsApp"}


class TaskInferrer:
    def infer(self, domains, document_type, programming_language, tool):
        domains = set(domains or [])
        tasks = []

        if programming_language or "development" in domains:
            tasks.append("coding")
        if document_type in ("spreadsheet", "dataset", "data"):
            tasks.append("data_analysis")
        if document_type in ("document", "text", "notes"):
            tasks.append("writing")
        if document_type == "pdf":
            tasks.append("reviewing")
        if document_type in ("presentation", "meeting"):
            tasks.append("presenting")
        if document_type in ("image", "design", "3d", "cad"):
            tasks.append("designing")
        if "meeting" in domains or tool in MEETING_TOOLS:
            tasks.append("meeting")
        if "communication" in domains and tool in COMMUNICATION_TOOLS:
            tasks.append("communicating")
        if "support" in domains:
            tasks.append("supporting")
        if "crm" in domains:
            tasks.append("selling")
        if "browser" in domains or "web" in domains:
            tasks.append("browsing")
        if "erp" in domains:
            tasks.append("erp_operation")

        if not tasks:
            tasks.append("using_tool")

        seen = set()
        unique = []
        for task in tasks:
            if task not in seen:
                seen.add(task)
                unique.append(task)
        return unique
