function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function Avatar({ name, imageUrl, size = 48 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        style={style}
        className="rounded-full object-cover shadow-resting"
      />
    );
  }
  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full bg-brand font-semibold text-text-onBrand shadow-resting"
    >
      {initials(name)}
    </div>
  );
}
