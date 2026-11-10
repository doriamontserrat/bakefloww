import { useState, useRef } from "react";
import { Store, User, ShoppingBag, Eye, EyeOff, ArrowRight, Sparkles, Cake, Package, Phone, MapPin, ImagePlus, X, Calendar } from "lucide-react";
import Logo from "../components/Logo";
import newLogoImg from "@/imports/0d72255c-5f7a-9c92-b256-12eb6a4e2091.jpeg";
import { loginUser, registerUser, type Role } from "./authService";
import { api, uploadImage } from "../services/api";

interface AuthPageProps {
  onLogin: (role: Role, name: string) => void;
}

const FEATURES = [
  { Icon: Cake, text: "Gestiona tu menú y catálogo de pasteles" },
  { Icon: Package, text: "Seguimiento de pedidos en tiempo real" },
  { Icon: Sparkles, text: "Pasteles personalizados con wizard" },
];

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<Role>("customer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [regForm, setRegForm] = useState({
    name: "", bakeryName: "", email: "", password: "",
    phone: "", address: "", birthday: "",
  });
  const [showRegPw, setShowRegPw] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // La foto se sube al servidor justo después de crear la cuenta (antes no hay sesión); aquí solo se previsualiza
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setError("La foto debe ser una imagen de máximo 5 MB."); return; }
    setPhotoFile(file);
    setProfilePhoto(URL.createObjectURL(file));
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await loginUser(email.trim(), password);
      onLogin(user.role, user.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regForm.name || !regForm.email || !regForm.password) { setError("Por favor completa los campos obligatorios."); return; }
    if (regForm.password.length < 6) { setError("La contraseña debe tener mínimo 6 caracteres."); return; }
    setError("");
    setLoading(true);
    try {
      const { user } = await registerUser({
        name: regForm.name.trim(),
        email: regForm.email.trim(),
        password: regForm.password,
        role,
        phone: regForm.phone || undefined,
        address: regForm.address || undefined,
        birthday: regForm.birthday || undefined,
        bakeryName: role === "bakery" ? regForm.bakeryName.trim() || undefined : undefined,
      });
      if (photoFile) {
        try {
          const url = await uploadImage(photoFile);
          await api("/users/profile", { method: "PUT", body: { profilePhoto: url } });
        } catch { /* la cuenta ya existe; la foto se puede subir después desde el perfil */ }
      }
      onLogin(user.role, role === "bakery" ? regForm.bakeryName || user.name : user.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  function setReg(key: string, val: string) {
    setRegForm(p => ({ ...p, [key]: val }));
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── LEFT DECORATIVE PANEL ─────────────────── */}
      <div className="hidden md:flex md:w-[480px] lg:w-[520px] shrink-0 relative bg-gradient-to-br from-pink-500 via-rose-400 to-violet-500 flex-col justify-between p-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/30 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/5 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="ring-2 ring-white/30 rounded-2xl">
            <Logo size={48} className="rounded-2xl" />
          </div>
          <span className="font-display text-3xl font-bold text-white tracking-wide">BakeFlow</span>
        </div>

        {/* Hero text */}
        <div className="relative">
          <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-3">La plataforma para</p>
          <h2 className="font-display text-5xl font-bold text-white leading-tight mb-6">
            Pastelerías<br />modernas
          </h2>
          <div className="space-y-4">
            {FEATURES.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <p className="text-white/80 text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Floating BakeFlow logo illustration */}
        <div className="relative self-center animate-float">
          <div className="w-44 h-44 bg-white/15 rounded-[2.5rem] flex items-center justify-center backdrop-blur-sm border border-white/20 overflow-hidden p-3">
            <img src={newLogoImg} alt="BakeFlow" className="w-full h-full object-contain drop-shadow-lg rounded-2xl" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/15 blur-md rounded-full" />
        </div>

        <p className="relative text-white/40 text-xs text-center">© 2026 BakeFlow · Hecho con amor</p>
      </div>

      {/* ── RIGHT FORM PANEL ──────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background bg-grid overflow-y-auto">
        {/* Mobile logo */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <div className="animate-float mb-3 w-20 h-20 rounded-3xl shadow-lg overflow-hidden bg-white p-1">
            <img src={newLogoImg} alt="BakeFlow" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <h1 className="font-display text-3xl font-bold gradient-text">BakeFlow</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">La plataforma para pastelerías</p>
        </div>

        <div className="w-full max-w-md">
          <div className="hidden md:block mb-8">
            <h2 className="font-display text-3xl font-bold text-foreground">
              {mode === "login" ? "Bienvenida de vuelta" : "Crea tu cuenta"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1 font-medium">
              {mode === "login" ? "Ingresa a tu cuenta para continuar" : "Empieza gratis, sin tarjeta de crédito"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-muted rounded-2xl p-1 mb-6 border border-border">
            {[["login", "Iniciar sesión"], ["register", "Registrarse"]].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m as "login" | "register"); setError(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === m ? "bg-white text-pink-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {l}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-up">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Correo electrónico</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Contraseña</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" className="input-base pr-12" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold rounded-2xl btn-glow flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                {loading ? "Entrando..." : <>Entrar <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-up">
              {/* Account type */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Tipo de cuenta</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "customer", label: "Cliente", Icon: ShoppingBag, color: "from-pink-400 to-rose-400" },
                    { value: "bakery", label: "Pastelería", Icon: Store, color: "from-violet-400 to-pink-400" },
                  ].map(({ value, label, Icon, color }) => (
                    <button key={value} type="button" onClick={() => setRole(value as Role)}
                      className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all text-sm font-bold
                        ${role === value
                          ? "border-pink-400 bg-pink-50 text-pink-600 shadow-sm"
                          : "border-border bg-muted text-muted-foreground hover:border-pink-200 hover:bg-card"}`}>
                      <div className={`w-7 h-7 ${role === value ? "bg-pink-500" : "bg-muted-foreground/20"} rounded-xl flex items-center justify-center shrink-0 transition-colors`}>
                        <Icon size={14} className="text-white" />
                      </div>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile photo */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <ImagePlus size={13} className="text-pink-400" /> Foto de perfil <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <div className="flex items-center gap-4">
                  {profilePhoto ? (
                    <div className="relative shrink-0">
                      <img src={profilePhoto} alt="Perfil" className="w-16 h-16 rounded-2xl object-cover border-2 border-pink-200" />
                      <button type="button" onClick={() => { setProfilePhoto(""); setPhotoFile(null); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center shrink-0">
                      <User size={22} className="text-muted-foreground" />
                    </div>
                  )}
                  <button type="button" onClick={() => photoRef.current?.click()}
                    className="flex-1 py-2.5 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50 hover:bg-pink-100 transition-colors text-xs font-bold text-pink-500 flex items-center justify-center gap-1.5">
                    <ImagePlus size={14} /> {profilePhoto ? "Cambiar foto" : "Subir foto"}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-2">
                  <User size={13} className="text-pink-400" /> Nombre completo <span className="text-pink-500">*</span>
                </label>
                <input type="text" value={regForm.name} onChange={(e) => setReg("name", e.target.value)}
                  placeholder="Tu nombre completo" className="input-base" />
              </div>

              {/* Bakery name (conditional) */}
              {role === "bakery" && (
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-2">
                    <Store size={13} className="text-pink-400" /> Nombre de tu pastelería
                  </label>
                  <input type="text" value={regForm.bakeryName} onChange={(e) => setReg("bakeryName", e.target.value)}
                    placeholder="Pastelería La Dulce Vida" className="input-base" />
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-2">
                  <Phone size={13} className="text-pink-400" /> Teléfono
                </label>
                <input type="tel" value={regForm.phone} onChange={(e) => setReg("phone", e.target.value)}
                  placeholder="+52 55 1234 5678" className="input-base" />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-2">
                  <MapPin size={13} className="text-pink-400" /> Dirección
                </label>
                <input type="text" value={regForm.address} onChange={(e) => setReg("address", e.target.value)}
                  placeholder="Calle, colonia, ciudad" className="input-base" />
              </div>

              {/* Birthday */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center gap-2">
                  <Calendar size={13} className="text-pink-400" /> Fecha de nacimiento
                </label>
                <input type="date" value={regForm.birthday} onChange={(e) => setReg("birthday", e.target.value)}
                  className="input-base" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Correo electrónico <span className="text-pink-500">*</span></label>
                <input type="email" value={regForm.email} onChange={(e) => setReg("email", e.target.value)}
                  placeholder="tu@correo.com" className="input-base" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Contraseña <span className="text-pink-500">*</span></label>
                <div className="relative">
                  <input type={showRegPw ? "text" : "password"} value={regForm.password} onChange={(e) => setReg("password", e.target.value)}
                    placeholder="Mínimo 6 caracteres" className="input-base pr-12" />
                  <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showRegPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-60">
                {loading ? "Creando cuenta..." : <>Crear cuenta <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}