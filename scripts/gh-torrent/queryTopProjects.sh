mkdir -p scripts/outputs
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo_log() { echo "`date --iso-8601=seconds`: $@"; }

database_query() {
  if [ ! -s scripts/outputs/$1.txt ]; then
    echo_log "$1"
    node "$SCRIPT_DIR/databaseQuery.js" $1 > "$SCRIPT_DIR/outputs/$1.txt"
    echo_log "$1 End"
  fi
}
database_query "JavaScript"
database_query "PHP"
database_query "Python"
database_query "C++"
database_query "Ruby"
database_query "Java"
database_query "TypeScript"
database_query "C#"
database_query "C"
database_query "Objective-C"
