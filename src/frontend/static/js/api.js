
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

  async getLanguages() {
    const res = await fetch("/api/scripts/languages", {
      headers: {
        "Cookie": `access_token=${this.access_token}`
      }
    })

    const json = await res.json();

    return json;
  }

  async createScript(name, extension, content) {
    const res = await fetch("/api/scripts", {
      method: "POST",
      body: JSON.stringify({
        name,
        extension,
        content
      }),
      headers: {
        "Cookie": `access_token=${this.access_token}`,
        "Content-Type": "application/json"
      }
    })

    const json = await res.json();

    return json;
  }

  async deleteScript(name, extension) {
    const res = await fetch("/api/scripts", {
      method: "DELETE",
      body: JSON.stringify({
        name,
        extension
      }),
      headers: {
        "Cookie": `access_token=${this.access_token}`,
        "Content-Type": "application/json"
      }
    })

    const json = await res.json();

    return json;
  }
}

const api = new API();