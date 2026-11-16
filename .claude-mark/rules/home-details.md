# Home and dev set-up details stay out of the repository

The repository is public. Anything written here can be read by anyone,
and stays readable in git history after it is deleted. So nothing that
locates or reaches the machines Turva is built on goes into code, docs,
plans, comments, commit messages or pull requests:

- **Addresses** - on a home or office network or a private network
  such as a VPN, IPv4 or IPv6.
- **The private network's name** - the name a VPN service gives a
  network, such as `<name>.ts.net`. The service's bare domain names
  nothing and is fine.
- **Device names** - the hostnames of laptops, phones and any other
  machine a developer works on, and their MAC addresses.
- **The network itself** - the router's make or model, the Wi-Fi name,
  the ISP.
- **The place** - an address, a town, anything that says where the
  machines are.

**A plan that has to refer to one says it in angle brackets**:
`<the server's LAN address>`, `<the computer's VPN name>`. The step is
about which machine could reach what, not about the value, and reads
just as well.

**Nothing checks this automatically here**, so it rests on whoever is
writing. If one of these details turns up in a file, take it out; do
not paste it into a commit message, a pull request or a comment to ask
about it.

A generic name for a machine, such as "the dev box", and the username
in a path are fine: they say there is a machine, not how to reach it.
