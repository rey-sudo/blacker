import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../widgets/pulsating_indicator.dart';

class BotPage extends StatelessWidget {
  final Map<String, dynamic> bot;

  const BotPage({super.key, required this.bot});

  @override
  Widget build(BuildContext context) {
    final infoLength = bot["info"].length;
    final crossAxisCount = 3;
    final tileHeight = 40.0;
    final rowCount = (infoLength / crossAxisCount).ceil();
    final gridHeight = rowCount * tileHeight;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(bot["id"] ?? "Bot"),
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: Theme.of(context).dividerColor, height: 1.0),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 12),

            /// HEADER
            Obx(
              () => Row(
                children: [
                  Text(
                    bot["symbol"],
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 6),
                  SvgPicture.asset(
                    'assets/icons/binance.svg',
                    width: 20,
                    height: 20,
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      PulsatingIndicator(
                        isActive: bot["live"]?.value ?? false,
                        size: 10,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        bot["live"]?.value == true ? "Live" : "Offline",
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            Text(
              "Iteration: ${bot["iteration"]}",
              style: Theme.of(context).textTheme.bodyMedium,
            ),

            const SizedBox(height: 12),

            /// GRID INFO
            SizedBox(
              height: gridHeight,
              child: GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: crossAxisCount,
                childAspectRatio: 3 / 1,
                crossAxisSpacing: 4,
                mainAxisSpacing: 4,
                children: List.generate(infoLength, (i) {
                  int colPosition = i % crossAxisCount;

                  Alignment alignment;
                  CrossAxisAlignment crossAlign;

                  switch (colPosition) {
                    case 0:
                    case 1:
                      alignment = Alignment.centerLeft;
                      crossAlign = CrossAxisAlignment.start;
                      break;
                    case 2:
                      alignment = Alignment.centerRight;
                      crossAlign = CrossAxisAlignment.end;
                      break;
                    default:
                      alignment = Alignment.centerLeft;
                      crossAlign = CrossAxisAlignment.start;
                  }

                  final actions = bot["info"];
                  final title = actions[i]["title"] ?? "";
                  final subtitle = actions[i]["subtitle"] ?? "";

                  return InkWell(
                    onTap: () => print("${bot["id"]} - $title presionado"),
                    child: Align(
                      alignment: alignment,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: crossAlign,
                        children: [
                          Text(
                            title,
                            style: Theme.of(
                              context,
                            ).textTheme.bodySmall?.copyWith(color: Colors.grey),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color:
                                      (title == "Status" &&
                                              subtitle == "Stopped") ||
                                          subtitle == "Error"
                                      ? Colors.red
                                      : Colors.black,
                                ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),

            const SizedBox(height: 16),

            Divider(color: Theme.of(context).dividerColor),

            const SizedBox(height: 16),

            Text(
              "Description",
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 8),

            Text(
              bot["description"],
              style: Theme.of(context).textTheme.bodyMedium,
            ),

            const SizedBox(height: 8),

            DefaultTabController(
              length: 3,
              child: Column(
                children: [
                  TabBar(
                    labelColor: Theme.of(context).primaryColor,
                    dividerColor: Theme.of(context).dividerColor,
                    unselectedLabelColor: Colors.grey,
                    indicatorColor: Theme.of(context).primaryColor,
                    labelStyle: Theme.of(context).textTheme.bodySmall,
                    unselectedLabelStyle: Theme.of(context).textTheme.bodySmall,
                    tabs: const [
                      Tab(icon: Icon(Icons.show_chart), text: "Performance"),
                      Tab(
                        icon: Icon(Icons.account_balance_wallet),
                        text: "Trades",
                      ),
                      Tab(icon: Icon(Icons.settings), text: "Config"),
                    ],
                  ),
                  SizedBox(
                    height: 200, // altura del contenido
                    child: const TabBarView(
                      children: [
                        Center(child: Text("Performance stats...")),
                        Center(child: Text("Trades history...")),
                        Center(child: Text("Configuration details...")),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
