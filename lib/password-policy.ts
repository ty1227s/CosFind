export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIREMENTS = "12文字以上で、英大文字・英小文字・数字・記号を各1文字以上使用してください（空白不可）";

export function isStrongPassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH
    && password.length <= PASSWORD_MAX_LENGTH
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9\s]/.test(password)
    && !/\s/.test(password);
}
