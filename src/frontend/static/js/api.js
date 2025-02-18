
class API {
  constructor(access_token) {
    this.access_token = access_token;
  }

  async getMe() {
    const res = await fetch("/api/users/@me", {
      headers: {
        "Cookie": `access_token=${this.access_token}`
      }
    })

    const json = await res.json();

    return json;
  }

  async getMyScripts() {
    const res = await fetch("/api/users/@me/scripts", {
      headers: {
        "Cookie": `access_token=${this.access_token}`
      }
    })

    const json = await res.json();

    return json;
  }
}

const api = new API();