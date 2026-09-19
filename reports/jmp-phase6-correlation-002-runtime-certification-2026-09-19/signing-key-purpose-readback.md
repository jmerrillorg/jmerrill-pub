# Signing Key Purpose Readback

| Field | Readback |
| --- | --- |
| KEY_PURPOSE | Dataverse plug-in strong-name signing |
| KEY_TYPE | Strong-name key pair (`.snk`) |
| ALGORITHM | RSA signature; strong-name SHA-1 metadata |
| CURRENT_OWNER | J Merrill Publishing platform commissioning authority |
| CURRENT_STORAGE | Existing controlled local commissioning evidence path outside Git |
| CURRENT_CONSUMERS | JMP Publishing V2 Dataverse plug-in assemblies |
| CURRENT_SIGNING_PURPOSE | Assembly identity and package signing only |
| EXPORTABILITY | Existing file-backed key; no export performed in this packet |
| ROTATION_AUTHORITY | Founder/platform governance; no rotation performed |
| SHA-256 metadata | `48d0ace59aa7f36a7f7e73b2aa88d430ffa5cf04c562c7b235aa59fff669b095` |
| Public key token | `fffbe8b3d67a6cc0` |

Classification: `ASSEMBLY_OR_PACKAGE_SIGNING_ONLY`.

The key was used only as an MSBuild assembly-originator input. It was not copied into the repository, solution, Dataverse, evidence, logs, chat, or application settings and was not repurposed for request authentication. `SIGNING_KEY_EXPOSED = NO`. Its current local file custody should be hardened before a future rebuild, but the runtime has no dependency on the file or on 1Password.
