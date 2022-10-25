import logoImage from "../../assets/images/favicon.png";
export default function Footer() {
  return (
    <section className="pt-6">
      <div className="max-w-7xl mx-auto px-5 py-6 lg:px-0 flex justify-between gap-2 border-t text-sm text-slate-400">
        <div className="flex justify-center items-center">
          <p>Copyright 2022</p>
          <img className="h-8 ml-10" src={logoImage} alt="Learn with Sumit" />
          <p>(Chat Application)</p>
        </div>
        <div>
          <p>omaralabdullah051@gmail.com</p>
        </div>
      </div>
    </section>
  );
}
