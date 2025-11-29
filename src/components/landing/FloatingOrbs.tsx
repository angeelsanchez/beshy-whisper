export default function FloatingOrbs() {
  return (
    <>
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-amber-200 to-orange-300 rounded-full opacity-20 animate-float" />
      <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-pink-200 to-rose-300 rounded-full opacity-20 animate-float-delayed" />
      <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-r from-blue-200 to-purple-500 rounded-full opacity-20 animate-float-slow" />
    </>
  );
}
