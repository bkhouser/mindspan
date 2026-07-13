import type { TopicMastery } from "@/domain/types";

interface MemberCoverage { id: string; name: string; mastery: TopicMastery[] }

export function GroupCoverage({ members, topics }: { members: MemberCoverage[]; topics: Array<{ id: string; name: string }> }) {
  if (members.length <= 3) {
    const colors = ["bg-cyan-400/30", "bg-amber-400/30", "bg-fuchsia-400/30"];
    const positions = members.length === 2 ? ["left-[8%] top-[15%]", "right-[8%] top-[15%]"] : ["left-[5%] top-[8%]", "right-[5%] top-[8%]", "left-[25%] bottom-[3%]"];
    return <div className="relative mx-auto aspect-square max-w-md">{members.map((member, index) => <div className={`absolute grid h-[58%] w-[58%] place-items-center rounded-full p-8 text-center backdrop-blur ${colors[index]} ${positions[index]}`} key={member.id}><div><b>{member.name}</b><small className="mt-2 block">{member.mastery.filter((value) => value.rankScore && value.rankScore >= .5).length} strong topics</small></div></div>)}</div>;
  }
  return <div className="overflow-x-auto"><table className="w-full min-w-[600px] border-separate border-spacing-2 text-sm"><thead><tr><th className="text-left">Member</th>{topics.map((topic) => <th className="whitespace-nowrap text-xs" key={topic.id}>{topic.name}</th>)}</tr></thead><tbody>{members.map((member) => <tr key={member.id}><th className="text-left">{member.name}</th>{topics.map((topic) => { const value = member.mastery.find((item) => item.topicId === topic.id)?.proficiency ?? .5; return <td key={topic.id}><div aria-label={`${Math.round(value * 100)} percent`} className="h-8 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, var(--brand) ${Math.round(value * 100)}%, var(--surface-raised))` }} /></td>; })}</tr>)}</tbody></table></div>;
}
