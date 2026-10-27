#!/usr/bin/env bash
set -euo pipefail

"$JBOSS_HOME/bin/standalone.sh" -b 0.0.0.0 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' TERM INT EXIT

cli="$JBOSS_HOME/bin/jboss-cli.sh"
ready=false
for ((attempt = 1; attempt <= 60; attempt++)); do
    if "$cli" --connect --command=':read-attribute(name=server-state)' 2>/dev/null | grep -q '"result" => "running"'; then
        ready=true
        break
    fi
    sleep 1
done
if [[ "$ready" != true ]]; then
    echo "WildFly did not start in time" >&2
    exit 1
fi

if ! "$cli" --connect --command='/deployment=postgresql.jar:read-resource' | grep -q '"outcome" => "success"'; then
    "$cli" --connect --command='deploy /opt/jboss/postgresql.jar --name=postgresql.jar'
fi

if ! "$cli" --connect --command='/subsystem=datasources/data-source=StudentsDS:read-resource' | grep -q '"outcome" => "success"'; then
    "$cli" --connect --command="data-source add --name=StudentsDS --jndi-name=java:/jdbc/StudentsDS --driver-name=postgresql.jar --connection-url=${DB_URL} --user-name=${DB_USER} --password=${DB_PASSWORD} --enabled=true"
fi

"$cli" --connect --command='/subsystem=datasources/data-source=StudentsDS:test-connection-in-pool' | grep -q '\[true\]'
"$cli" --connect --command='deploy /opt/jboss/ROOT.war --name=ROOT.war --force'

wait "$server_pid"
