function StepIndicator({ step, isDay }: { readonly step: number; readonly isDay: boolean }): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s === step ? 'w-8' : 'w-4'
          } ${
            s <= step
              ? isDay ? 'bg-[#4A2E1B]' : 'bg-[#F5F0E1]'
              : isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20'
          }`}
        />
      ))}
    </div>
  );
}

export default StepIndicator;
