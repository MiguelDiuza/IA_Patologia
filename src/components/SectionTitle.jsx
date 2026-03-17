export default function SectionTitle({ text1, text2, text3 }) {
    return (
        <div className="flex flex-col items-center">
            <p className="font-medium text-indigo-600 dark:text-indigo-400 mt-28 px-10 py-2 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-max mx-auto shadow-sm tracking-wide">{text1}</p>
            <h3 className="text-4xl md:text-5xl font-bold text-center mx-auto mt-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">{text2}</h3>
            <p className="text-slate-400 text-center mt-4 max-w-2xl mx-auto text-lg leading-relaxed">{text3}</p>
        </div>
    );
}