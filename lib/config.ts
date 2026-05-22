export const config = {
  get isInviteOnly() {
    return process.env.INVITE_ONLY !== "false"
  },
}
