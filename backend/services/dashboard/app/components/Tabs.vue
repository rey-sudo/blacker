<script setup>
// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
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

import Sortable from "sortablejs";
import { ref, onMounted, nextTick } from "vue";

const tabManager = useTabManager();
const tabsContainer = ref(null);

onMounted(async () => {
  await nextTick();

  Sortable.create(tabsContainer.value, {
    animation: 200,
    direction: "horizontal",
    ghostClass: "opacity-40",
    draggable: "[data-id]",
    onEnd: (evt) => {
      if (
        evt.oldIndex == null ||
        evt.newIndex == null ||
        evt.oldIndex === evt.newIndex
      )
        return;

      tabManager.moveTab(evt.oldIndex, evt.newIndex);
    },
  });
});
</script>

<template>
  <div
    class="flex gap-2 overflow-x-auto items-baseline box-border h-[inherit]"
    ref="tabsContainer"
  >
    <Tab
      v-for="tab in tabManager.allTabs"
      :key="tab.id"
      :data-id="tab.id"
      :tabId="String(tab.id)"
      :isActive="tabManager.activeTabId === tab.id"
      @click="tabManager.selectTab(tab.id)"
      class="mt-auto"
    />
  </div>
</template>
