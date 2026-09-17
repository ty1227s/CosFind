"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "./site-header";

export function ForgotPasswordForm() {
  const params = useSearchParams();
  const sent = params.get("sent") === "1";
  const unavailable = params.get("error") === "unavailable";

  return <>
    <SiteHeader />
    <main className="form-page auth-flow-page">
      <section className="auth-card">
        <p className="eyebrow">PASSWORD RESET</p>
        <h1>パスワードを忘れた方</h1>
        {sent ? <div className="reset-request-complete" role="status">
          <b aria-hidden="true">✉</b>
          <h2>メールをご確認ください</h2>
          <p>入力されたメールアドレスに一致するアカウントがある場合、パスワード再設定メールを送信しました。</p>
          <p className="reset-security-note">セキュリティ保護のため、アカウントの登録状況は表示しません。</p>
          <Link className="auth-secondary-link" href="/login">ログイン画面へ戻る</Link>
        </div> : <>
          <p>登録したメールアドレスを入力してください。パスワード再設定ページへのリンクをお送りします。</p>
          <form action="/api/auth/password-reset/request" method="post">
            <label className="field"><span>メールアドレス</span><input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="mail@example.com" /></label>
            {unavailable && <p className="form-error">現在メールを送信できません。しばらくしてからもう一度お試しください。</p>}
            <button className="submit" type="submit">再設定メールを送信</button>
            <p className="forgot-password-link"><Link href="/login">ログイン画面へ戻る</Link></p>
          </form>
        </>}
      </section>
    </main>
  </>;
}
