<script setup>
// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey - https://github.com/rey-sudo
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { useBacktestingTabStore } from '~/stores/tabs';

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const tab = useBacktestingTabStore(props.tabId)




</script>

<template>
  <div class="tab-backtesting">
    <BacktestingToolbar />
  </div>
</template>

<style lang="css" scoped>
.tab-backtesting {
  display: flex;
  flex-direction: column;
}
</style>
