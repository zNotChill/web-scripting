export type Config = {
  discord: {
    client_id: string,
    client_secret: string,
    client_redirect: string,
    auth_url: string,
  },
  server: {
    port: number,
    admin_key: string,
    mc_verification: {
      code_expire_time: number
    },
    scripting: {
      enabled_languages: string[],
      max_scripts: number
    }
  },
  mongo: {
    url: string
  }
}