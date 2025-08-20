import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ImageGrid extends StatelessWidget {
  final List<String> images;
  final int crossAxisCount;
  final double spacing;
  final double? childAspectRatio;
  final bool scrollable;

  const ImageGrid({
    super.key,
    required this.images,
    this.crossAxisCount = 2,
    this.spacing = 8,
    this.childAspectRatio,
    this.scrollable = false, 
  });

  void _openGallery(BuildContext context, int initialIndex) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black.withOpacity(0.9),
        pageBuilder: (_, __, ___) => _ImageGallery(
          images: images,
          initialIndex: initialIndex,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      itemCount: images.length,
      shrinkWrap: !scrollable,
      physics: scrollable
          ? const AlwaysScrollableScrollPhysics()
          : const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: spacing.w,
        mainAxisSpacing: spacing.h,
        childAspectRatio: childAspectRatio ?? 1.0,
      ),
      itemBuilder: (context, index) {
        final url = images[index];
        return GestureDetector(
          onTap: () => _openGallery(context, index),
          child: Hero(
            tag: "$url-$index",
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12.r),
              child: Image.network(
                url,
                fit: BoxFit.cover,
                cacheWidth: (0.5.sw ~/ crossAxisCount), 
              ),
            ),
          ),
        );
      },
    );
  }
}


class _ImageGallery extends StatefulWidget {
  final List<String> images;
  final int initialIndex;

  const _ImageGallery({
    required this.images,
    required this.initialIndex,
  });

  @override
  State<_ImageGallery> createState() => _ImageGalleryState();
}

class _ImageGalleryState extends State<_ImageGallery> {
  late final PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black.withOpacity(0.95),
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: widget.images.length,
            onPageChanged: (i) => setState(() => _currentIndex = i),
            itemBuilder: (context, index) {
              final url = widget.images[index];
              return Center(
                child: Hero(
                  tag: "$url-$index",
                  child: InteractiveViewer(
                    child: FittedBox( 
                      fit: BoxFit.contain,
                      child: Image.network(url),
                    ),
                  ),
                ),
              );
            },
          ),

          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: IconButton(
                icon: Icon(Icons.close, color: Colors.white, size: 32.sp),
                onPressed: () => Navigator.of(context).pop(),
                tooltip: 'Cerrar',
              ),
            ),
          ),

          SafeArea(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: EdgeInsets.only(bottom: 16.h),
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: 14.w,
                    vertical: 6.h,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(20.r),
                  ),
                  child: Text(
                    '${_currentIndex + 1}/${widget.images.length}',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16.sp,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
