export default function Button({ text }) {
  return (
    <button
      type="submit"
      className="w-full py-2.5 mt-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
    >
      {text}
    </button>
  );
}
