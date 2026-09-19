# Signing Key Purpose Readback

`JMP_PHASE6_SIGNING_KEY_PATH` is consumed only by the .NET project build as the assembly-originator key. Its purpose is strong-name signing of the Dataverse plug-in assembly.

Classification: `ASSEMBLY_OR_PACKAGE_SIGNING_ONLY`.

It is not an HMAC secret, request-signing private key, Entra credential, or caller-authorization mechanism. It must not be repurposed for request signing. The existing key remains required to rebuild the corrected assembly, but its approved storage/path is not currently available to this execution session. No key was created, rotated, exported, printed, committed, or placed in evidence.
