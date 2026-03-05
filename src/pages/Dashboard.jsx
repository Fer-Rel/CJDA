export default function Dashboard() {
    return (
        <div className="flex-1 flex items-center justify-center">
            <img
                src="/logo.png"
                alt="Logo del negocio"
                className="max-w-xs w-full h-auto object-contain"
                onError={(e) => {
                    e.currentTarget.style.display = 'none'
                }}
            />
        </div>
    )
}
