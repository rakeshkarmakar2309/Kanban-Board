const columns = ["backlog", "todo", "in-progress", "done"];
const priorities = ["low", "medium", "high"];
const editableFields = [
  "title",
  "description",
  "priority",
  "assignee",
  "status",
  "position",
];

module.exports = { columns, priorities, editableFields };
