#!/bin/bash

docker exec -it pulsar bin/pulsar-admin topics create persistent://public/default/master.tick
docker exec -it pulsar bin/pulsar-admin topics create persistent://public/default/engine.state


docker exec -it pulsar bin/pulsar-admin topics delete persistent://public/default/master.tick
docker exec -it pulsar bin/pulsar-admin topics delete persistent://public/default/engine.state


docker exec -it pulsar bin/pulsar-admin topics unsubscribe \
  --subscription engine-sub \
  persistent://public/default/master.tick