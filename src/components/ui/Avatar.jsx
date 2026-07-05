import { getInitials } from "../../utils/format";

const Avatar = ({ name, src, size = "md", className = "" }) => {
  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center ${sizes[size]} ${className}`}
    >
      {getInitials(name || "U")}
    </div>
  );
};

export default Avatar;
