interface LoginInfoGroupProps {
  title: string;
  description: string;
}

export function LoginInfoGroup({ title, description }: LoginInfoGroupProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
