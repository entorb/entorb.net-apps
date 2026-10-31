# shellcheck shell=sh
# App list and per-app node project dir. Sourced, not executed.

# shellcheck disable=SC2034 # used by the sourcing scripts (run_checks.sh, deploy.sh, update.sh)
APPS="idle oware tools"

js_dir() {
  case "$1" in
    # oware is multi-language, its node project lives in a subdir
    oware) echo "oware/web" ;;
    # tools is plain JS without build, its deployed files live in a subdir
    tools) echo "tools/web" ;;
    *) echo "$1" ;;
  esac
}
