function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-screen max-w-full border-t border-gray-200 px-5 py-3 shadow-sm">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-bold text-center text-black lg:text-xl">
          Taylin @ <span>{currentYear}</span>
        </p>
      </div>
    </footer>
  )
}

export default Footer;
