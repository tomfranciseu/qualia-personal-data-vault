const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const WORKSPACE_DEPS = {
    "@qualia/personal-data-vault-core": "file:../personal-data-vault-core",
    "@qualia/personal-data-vault-prisma": "file:../personal-data-vault-prisma",
    "@qualia/personal-data-vault-next": "file:../personal-data-vault-next",
    "@qualia/personal-data-vault-s3-storage": "file:../personal-data-vault-s3-storage",
};

for (const dir of [
    "packages/personal-data-vault-core",
    "packages/personal-data-vault-prisma",
    "packages/personal-data-vault-next",
    "packages/personal-data-vault-client",
    "packages/personal-data-vault-react",
    "packages/personal-data-vault-s3-storage",
    "apps/vault-api",
]) {
    const pkgPath = path.join(root, dir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.dependencies) {
        for (const [k] of Object.entries(pkg.dependencies)) {
            if (WORKSPACE_DEPS[k]) {
                pkg.dependencies[k] = dir.startsWith("apps/")
                    ? `file:../../packages/${k.replace("@qualia/personal-data-vault-", "personal-data-vault-")}`
                    : WORKSPACE_DEPS[k];
            }
        }
    }
    if (!pkg.files && pkg.name?.startsWith("@qualia/personal-data-vault")) {
        pkg.files = ["src"];
    }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}
