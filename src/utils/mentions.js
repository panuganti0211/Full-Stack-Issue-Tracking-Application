export const extractMentions = (content, members = []) => {
  if (!content) return [];
  const pattern = /@([\w][\w\s]*?)(?=\s|$|[.,!?])/g;
  const mentions = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const mentionName = match[1].trim().toLowerCase();
    const member = members.find(
      (m) => m.profiles?.full_name?.toLowerCase() === mentionName
    );
    if (member && !mentions.includes(member.user_id)) {
      mentions.push(member.user_id);
    }
  }

  return mentions;
};

export const highlightMentions = (content) => {
  if (!content) return "";
  return content.replace(
    /@([\w][\w\s]*?)(?=\s|$|[.,!?])/g,
    '<span class="text-indigo-600 font-medium">@$1</span>'
  );
};
