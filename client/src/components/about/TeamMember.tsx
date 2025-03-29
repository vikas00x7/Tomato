import { TeamMember as TeamMemberType } from "@/lib/types";

interface TeamMemberProps {
  member: TeamMemberType;
}

const TeamMember = ({ member }: TeamMemberProps) => {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md">
      <img
        src={member.image}
        alt={member.name}
        className="w-full h-64 object-cover"
        loading="lazy"
      />
      <div className="p-6">
        <h3 className="text-xl font-serif font-bold mb-1">{member.name}</h3>
        <p className="text-tomato-500 font-medium text-sm mb-4">
          {member.position}
        </p>
        <p className="text-gray-600">{member.bio}</p>
      </div>
    </div>
  );
};

export default TeamMember;
