"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "./site-header";

const signupErrors: Record<string, string> = {
  username: "ユーザー名は半角英小文字・数字・アンダースコアの3～24文字で入力してください。",
  email: "正しいメールアドレスを入力してください。",
  password_length: "パスワードは8文字以上で入力してください。",
  password_match: "確認用パスワードが一致しません。",
  username_taken: "そのユーザー名はすでに使用されています。",
  email_taken: "そのメールアドレスはすでに登録されています。",
  config: "ユーザー登録の設定が完了していません。",
  profile: "プロフィールを作成できませんでした。もう一度お試しください。",
  create: "ユーザーを登録できませんでした。入力内容をご確認ください。",
  server: "登録情報を確認できませんでした。しばらくしてからお試しください。",
};

export function LoginForm() {
  const params = useSearchParams();
  const [signup, setSignup] = useState(params.get("mode") === "signup");
  const error = params.get("error");
  const registered = params.get("registered");

  return <>
    <SiteHeader />
    <main className="form-page">
      <section className="auth-card">
        <div className={`auth-switch${signup ? " show-signup" : ""}`} role="tablist" aria-label="ログイン方法">
          <button type="button" role="tab" aria-selected={!signup} className={!signup ? "active" : ""} onClick={() => setSignup(false)}>ログイン</button>
          <button type="button" role="tab" aria-selected={signup} className={signup ? "active" : ""} onClick={() => setSignup(true)}>新規ユーザー登録</button>
        </div>
        {signup ? <>
          <p className="eyebrow">CREATE ACCOUNT</p>
          <h1>新規ユーザー登録</h1>
          <p>登録情報は運営管理に使用し、投稿者情報として一般ユーザーには表示しません。</p>
          <form action="/api/auth/signup" method="post">
            <label className="field"><span>ユーザー名</span><input name="username" autoComplete="username" minLength={3} maxLength={24} pattern="[a-z0-9_]+" required placeholder="cosme_user" /><small>半角英小文字・数字・_ の3～24文字</small></label>
            <label className="field"><span>メールアドレス</span><input name="email" type="email" autoComplete="email" required /></label>
            <label className="field"><span>パスワード</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /><small>8文字以上</small></label>
            <label className="field"><span>パスワード（確認）</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required /></label>
            {error && <p className="form-error">{signupErrors[error] || "登録できませんでした。もう一度お試しください。"}</p>}
            <button className="submit" type="submit">登録して始める</button>
          </form>
        </> : <>
          <p className="eyebrow">WELCOME BACK</p>
          <h1>ログイン</h1>
          <p>ユーザー名または登録メールアドレスと、パスワードでログインします。投稿者情報は一般ユーザーには表示されません。</p>
          <form action="/api/auth/login" method="post">
            <label className="field"><span>ユーザー名またはメールアドレス</span><input name="identifier" autoComplete="username" minLength={3} required placeholder="cosme_user または mail@example.com" /></label>
            <label className="field"><span>パスワード</span><input name="password" type="password" autoComplete="current-password" required /></label>
            {registered && <p className="form-success">{registered === "check-email" ? "確認メールを送信しました。メール内のリンクで登録を完了してください。" : "登録が完了しました。ログインしてください。"}</p>}
            {error && !params.get("mode") && <p className="form-error">{error === "config" ? "本番ログインの設定が必要です。" : "ユーザー名・メールアドレスまたはパスワードが違います。"}</p>}
            <button className="submit" type="submit">ログイン</button>
            <p className="login-note">アカウントをお持ちでない場合は「新規ユーザー登録」を選択してください。</p>
          </form>
        </>}
      </section>
    </main>
  </>;
}
