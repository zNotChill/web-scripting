export type Config = {
  discord: {
    client_id: string,
    client_secret: string,
    client_redirect: string,
    auth_url: string
  },
  server: {
    port: number,
    admin_key: string,
    mc_verification: {
      code_expire_time_ms: number
    },
    scripting: {
      enabled_languages: string[],
      max_scripts_per_user: number,
      upload_size_limit_kb: number,
      individual_edit_cooldown_sec: number
    }
  },
  mongo: {
    url: string
  }
}