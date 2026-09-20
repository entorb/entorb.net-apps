# App list and per-app node project dir. Sourced, not executed.

# shellcheck disable=SC2034 # used by the sourcing scripts (run_checks.sh, deploy.sh, update.sh)
APPS="idle multitimer oware"

js_dir() {
  case "$1" in
    # oware is multi-language, its node project lives in a subdir
    oware) echo "oware/web" ;;
    *) echo "$1" ;;
  esac
}
