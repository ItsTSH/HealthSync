export default function Button({ text, disabled, onClick, type="submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2.5 mt-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {text}
    </button>
  );
}