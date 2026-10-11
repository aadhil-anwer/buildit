import { generated } from "./strings.generated";

// Strings the design doc does not have (it only covers the designed screens).
// The Arabic here has not had a native-speaker review (see OPEN_ISSUES.md).
const extra = {
  en: {
    errTitle: "Something went wrong",
    errBody: "If it keeps happening, close and reopen the app.",
    back: "Back",
    langEn: "English",
    langAr: "العربية",
    authEmailTitle: "Your email",
    authEmailHint: "We'll send you a six-digit code. No password needed.",
    authEmailLabel: "Email address",
    authSend: "Send code",
    authCodeTitle: "Enter the code",
    authCodeHint: "We sent a six-digit code to {0}.",
    authCodeLabel: "Six-digit code",
    authVerify: "Continue",
    authResend: "Send a new code",
    authBadEmail: "That doesn't look like an email address. Check it and try again.",
    authBadCode: "That code didn't work. Check it, or send a new code.",
    authOffline: "Couldn't reach BuildIt. Check your connection and try again.",
    authRate: "Too many codes requested. Wait a minute, then try again.",
  },
  ar: {
    errTitle: "حدث خطأ ما",
    errBody: "إذا استمرت المشكلة، فأغلق التطبيق وأعد فتحه.",
    back: "رجوع",
    langEn: "English",
    langAr: "العربية",
    authEmailTitle: "بريدك الإلكتروني",
    authEmailHint: "سنرسل إليك رمزًا من ستة أرقام. لا حاجة إلى كلمة مرور.",
    authEmailLabel: "عنوان البريد الإلكتروني",
    authSend: "أرسل الرمز",
    authCodeTitle: "أدخل الرمز",
    authCodeHint: "أرسلنا رمزًا من ستة أرقام إلى {0}.",
    authCodeLabel: "الرمز المكوّن من ستة أرقام",
    authVerify: "متابعة",
    authResend: "أرسل رمزًا جديدًا",
    authBadEmail: "لا يبدو هذا عنوان بريد إلكتروني. تحقق منه وحاول مرة أخرى.",
    authBadCode: "لم يعمل هذا الرمز. تحقق منه أو اطلب رمزًا جديدًا.",
    authOffline: "تعذّر الوصول إلى BuildIt. تحقق من اتصالك وحاول مرة أخرى.",
    authRate: "طُلبت رموز كثيرة. انتظر دقيقة ثم حاول مرة أخرى.",
  },
} as const;

export const strings = {
  en: { ...generated.en, ...extra.en },
  ar: { ...generated.ar, ...extra.ar },
} as const;
